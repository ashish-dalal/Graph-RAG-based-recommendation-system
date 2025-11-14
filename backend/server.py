import networkx as nx
import nx_arangodb as nxadb
from arango import ArangoClient
import pandas as pd
import numpy as np
import requests
import urllib.parse
import matplotlib.pyplot as plt
from random import randint
import re
import os
import io
from dotenv import load_dotenv
import json
from typing import List, Dict, Any, Optional
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from langchain_openai import ChatOpenAI
from langchain_community.graphs import ArangoGraph
from langchain_community.chains.graph_qa.arangodb import ArangoGraphQAChain
from langchain_core.tools import tool
from flask import Flask, request, jsonify
from flask_cors import CORS

load_dotenv()

def fetch_wiki_content(query_term):
    search_endpoint = "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" + \
        urllib.parse.quote(query_term) + "&format=json&origin=*"

    resp = requests.get(search_endpoint)
    if resp.status_code != 200:
        raise Exception(f"Failed to fetch search results. Received: {resp.status_code} {resp.reason}")

    data = resp.json()
    if len(data["query"]["search"]) == 0:
        return "No information found on Wikipedia"

    page_title = data["query"]["search"][0]["title"]

    content_endpoint = "https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&titles=" + \
        urllib.parse.quote(page_title) + "&explaintext=1&origin=*"

    content_resp = requests.get(content_endpoint)
    if content_resp.status_code != 200:
        raise Exception(f"Failed to fetch search results. Received: {content_resp.status_code} {content_resp.reason}")

    content_data = content_resp.json()
    pages = content_data['query']['pages']
    page_id = list(pages.keys())[0]
    text_extract = pages[page_id]['extract']
    return text_extract

def query_location_data(loc, query_prefix="Most Popular places in "):
    key = os.getenv("GEMINI_API_KEY")
    full_query = query_prefix + loc
    endpoint = "https://maps.googleapis.com/maps/api/place/textsearch/json?query=" + \
        urllib.parse.quote(full_query) + f"&radius=20000&key={key}"

    resp = requests.get(endpoint)
    if resp.status_code != 200:
        raise Exception(f"Failed to fetch search results. Received: {resp.status_code} {resp.reason}")

    data = resp.json()
    return data["results"]

def build_location_context(target_loc, count=2):
    locations = query_location_data(target_loc, "Most Popular places in ")
    context_data = []

    for idx in range(min(count, len(locations))):
        content = fetch_wiki_content(locations[idx]["name"])

        context_item = {
            "place": locations[idx]["name"],
            "description": content,
            "destination": target_loc
        }
        context_data.append(context_item)

    return context_data

def invoke_llm(user_prompt):
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise ValueError("No Gemini API key provided. Set the GEMINI_API_KEY environment variable")

    endpoint = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent"

    headers = {"Content-Type": "application/json"}
    params = {"key": key}

    payload = {
        "contents": [{
            "parts": [{"text": user_prompt}]
        }],
        "generationConfig": {
            "temperature": 0.2,
            "topP": 0.8,
            "topK": 40,
            "maxOutputTokens": 8192
        }
    }

    resp = requests.post(endpoint, headers=headers, params=params, json=payload)

    if resp.status_code != 200:
        raise Exception(f"Failed to call Gemini API. Received: {resp.status_code} {resp.reason} - {resp.text}")

    result = resp.json()

    if "candidates" in result and len(result["candidates"]) > 0:
        if "content" in result["candidates"][0] and "parts" in result["candidates"][0]["content"]:
            return result["candidates"][0]["content"]["parts"][0]["text"]

    return "No response generated."

def extract_graph_data(target):
    context = build_location_context(target)

    prompt_text = f"""Based on the following information about tourist attractions in {target}, extract a highly detailed knowledge graph in TSV format that captures diverse relationships between attractions, their history, significance, and travel-related insights.
    {context}

    Format:
    Create a TSV with the following columns:

    Node_1: The name of the entity (e.g., attraction, person, event, historical figure, location, year).
    Relation: The relationship between Node_1 and Node_2 (e.g., LOCATED_IN, BUILT_IN, KNOWN_FOR, DESIGNED_BY, INFLUENCED_BY, HAS_EVENT, CULTURAL_IMPORTANCE, RECOMMENDED_ACTIVITY).
    Node_2: The entity that Node_1 is related to.
    Node_1_Type: The type of Node_1 (e.g., Attraction, Landmark, Event, Architect, Year, Culture, TravelTip).
    Node_2_Type: The type of Node_2 (e.g., Location, AttractionType, Architect, Year, CulturalAspect, RecommendedActivity).
    Attributes: A JSON string with additional information (e.g., opening hours, ticket price, notable facts, visiting tips).
    Guidelines:

    Extract at least 8 relationships per attraction to create a dense knowledge graph.
    Include core travel-related information such as:
    Best time to visit (e.g., "Eiffel Tower" → BEST_VISITED_IN → "Evening")
    Famous events held there (e.g., "Sydney Opera House" → HOSTS_EVENT → "Vivid Sydney Festival")
    Recommended activities (e.g., "Grand Canyon" → RECOMMENDED_ACTIVITY → "Hiking")
    Nearby attractions (e.g., "Louvre Museum" → NEARBY_ATTRACTION → "Seine River")
    Historical significance (e.g., "Colosseum" → HISTORIC_IMPORTANCE → "Gladiator battles")
    Influences (e.g., "Taj Mahal" → INFLUENCED_BY → "Mughal Architecture")
    Travel insights (e.g., "Machu Picchu" → TRAVEL_TIP → "Get tickets in advance")
    Ensure each attraction is connected to broader travel concepts, such as:
    The country it belongs to
    Related UNESCO heritage status (if applicable)
    Any notable designers, rulers, or figures associated with it
    Instructions for Output:

    Just return the TSV content without markdown formatting or extra text.
    The first line should be the header row."""

    tsv_data = invoke_llm(prompt_text)

    if "```" in tsv_data:
        tsv_data = tsv_data.split("```")[1].strip()
        if tsv_data.startswith("tsv"):
            tsv_data = tsv_data[3:].strip()

    return tsv_data

def build_knowledge_df(target_loc: str) -> pd.DataFrame:
    print(f"Creating travel knowledge graph for {target_loc}...")

    tsv_data = extract_graph_data(target_loc)
    df = pd.read_csv(io.StringIO(tsv_data), sep='\t')

    if 'Attributes' in df.columns:
        df['Attributes'] = df['Attributes'].apply(lambda x: '{}' if pd.isna(x) or x == '' else x)

        def validate_json(attr_val):
            try:
                if isinstance(attr_val, dict):
                    return json.dumps(attr_val)
                json.loads(attr_val)
                return attr_val
            except:
                return '{}'

        df['Attributes'] = df['Attributes'].apply(validate_json)

    df = df.drop_duplicates(subset=['Node_1', 'Relation', 'Node_2'])
    return df

def normalize_identifier(text):
    text = text.lower().strip()
    text = re.sub(r'[^a-z0-9_-]', '_', text)
    return text

def populate_graph(graph_obj, target):
    print(f"\nInput graph before modification: {graph_obj.number_of_nodes()} nodes and {graph_obj.number_of_edges()} edges")

    df = build_knowledge_df(target)

    print("\nSample of the knowledge graph data:")
    print(df.head(2).to_string())

    new_nodes = 0
    new_edges = 0

    for _, record in df.iterrows():
        n1_id = normalize_identifier(record['Node_1'])
        n2_id = normalize_identifier(record['Node_2'])

        if not graph_obj.has_node(n1_id):
            graph_obj.add_node(n1_id, key=n1_id, name=record['Node_1'], type=record['Node_1_Type'])
            new_nodes += 1

        if not graph_obj.has_node(n2_id):
            graph_obj.add_node(n2_id, key=n2_id, name=record['Node_2'], type=record['Node_2_Type'])
            new_nodes += 1

        if not graph_obj.has_edge(n1_id, n2_id):
            graph_obj.add_edge(n1_id, n2_id, relation=record['Relation'], attributes=record['Attributes'])
            new_edges += 1

    print(f"\nAdded {new_nodes} new nodes and {new_edges} new edges")
    print(f"Output graph after modification: {graph_obj.number_of_nodes()} nodes and {graph_obj.number_of_edges()} edges")

    return graph_obj

def visualize_graph(target):
    graph_obj = populate_graph(graph_obj, target)
    plt.figure(figsize=(20, 15))

    positions = nx.spring_layout(graph_obj, seed=42)
    nx.draw(graph_obj, positions, with_labels=True, node_size=1000, node_color="lightblue", edge_color="gray")

    edge_labels = {(u, v): d['relation'] for u, v, d in graph_obj.edges(data=True)}
    nx.draw_networkx_edge_labels(graph_obj, positions, edge_labels=edge_labels, font_size=10)

    plt.title("Knowledge Graph from LLM-Generated Table")
    plt.show()

def ensure_location_exists(loc_name, known_locs, graph_obj):
    try:
        if loc_name in known_locs:
            print("City already exists in the database")
            return graph_obj
        else:
            graph_obj = populate_graph(graph_obj, loc_name)
            print("City created successfully")
            return graph_obj
    except Exception as e:
        raise Exception(f"Error executing graph operation: {str(e)}")

def mark_selected_locations(all_locs, chosen_list):
    result = []
    for loc in all_locs:
        if loc["name"] in chosen_list:
            updated_loc = loc.copy()
            updated_loc["selected"] = True
            result.append(updated_loc)
    return result

def filter_recommendations(request_data, known_locs, graph_obj):
    graph_obj = ensure_location_exists(request_data["destination"], known_locs, graph_obj)

    all_locs = query_location_data(request_data["destination"], "Most Popular places in ")
    total = len(all_locs)
    loc_names = []
    context_results = []

    for idx in range(total):
        loc_name = all_locs[idx]["name"].replace('"', '')
        loc_id = normalize_identifier(loc_name)
        print(loc_id)
        loc_names.append(loc_name)

        try:
            node_info = graph_obj.nodes[loc_id]
            print(f"Found node {loc_id} in graph")
        except (KeyError, ValueError) as err:
            print(f"Node {loc_id} not found in graph: {str(err)}")
            context_results.append(f'Node "{loc_name}" was not found in the knowledge graph.')
            continue

        try:
            for depth in range(1, 4):
                try:
                    for target_node in nx.single_source_shortest_path_length(graph_obj, loc_id, cutoff=depth):
                        if target_node != loc_id:
                            try:
                                route = nx.shortest_path(graph_obj, loc_id, target_node)

                                relations = []
                                for step in range(len(route) - 1):
                                    edge_info = graph_obj.get_edge_data(route[step], route[step+1])
                                    if edge_info and 'relation' in edge_info:
                                        relations.append(edge_info['relation'])

                                src_type = graph_obj.nodes.get(loc_id, {}).get('type', 'unknown type')
                                dst_name = graph_obj.nodes.get(target_node, {}).get('name', 'unknown')
                                dst_type = graph_obj.nodes.get(target_node, {}).get('type', 'unknown type')

                                description = (f'Node "{loc_name}, a {src_type}" is connected to '
                                            f'Node "{dst_name}, a {dst_type}" by the '
                                            f'relationships: "{", ".join(relations)}".')
                                print(description)
                                context_results.append(description)
                            except nx.NetworkXNoPath:
                                continue
                except nx.NodeNotFound:
                    continue
        except Exception as err:
            print(f"Error processing place '{loc_name}': {str(err)}")
            context_results.append(f'Error processing relationships for "{loc_name}": {str(err)}')

    if not context_results:
        context_results.append("No relationship data could be retrieved from the knowledge graph for the given places.")

    analysis_prompt = f"""You are given a list of places and related details extracted from a Knowledge Graph. Your task is to recommend specific places based on the user's destination, budget, and interests.
                    Filter the relevant places from the data and return a JSON list containing only the exact names of the places, ensuring that the recommendations align with the user's preferences.

                    USER Data:
                    Total list of places: {loc_names}
                    Source information: {request_data["source"]}
                    Destination: {request_data["destination"]}
                    Departure Date: {request_data["departureDate"]}
                    Return Date: {request_data["returnDate"]}
                    Budget: {request_data["budget"]}
                    Description of the user's interests: {request_data["description"]}

                    Knowledge Graph Data:
                    {context_results}
                    """

    try:
        llm_response = invoke_llm("You are a travel expert and your task is to recommend specific places based on the user's destination, budget, and interests." + analysis_prompt)

        try:
            parsed_result = llm_response.strip()

            if "```" in llm_response:
                parsed_result = llm_response.split("```")[1].strip()
                if parsed_result.startswith("json"):
                    parsed_result = parsed_result[4:].strip()
            else:
                pattern = r'\[\s*"[^"]*"(?:\s*,\s*"[^"]*")*\s*\]'
                match = re.search(pattern, llm_response)
                if match:
                    parsed_result = match.group(0)

            chosen_list = json.loads(parsed_result)
        except (json.JSONDecodeError, IndexError) as err:
            print(f"Error parsing API response: {str(err)}")
            chosen_list = loc_names

        final_results = mark_selected_locations(all_locs, chosen_list)
        return final_results, graph_obj
    except Exception as err:
        print(f"Error calling Gemini API: {str(err)}")
        return loc_names, graph_obj

def generate_itinerary(chosen_locs, preferences):
    template = '''[
                {
                  "place_id": 0,
                  "name": "Burj Khalifa",
                  "details": "The Burj Khalifa is the tallest building in the world and a major attraction. Start your day early to avoid long queues for the observation deck.",
                  "timing": "9:00 AM to 10:30 AM"
                  "Famous Activity": "Photoshoots",
                  "total_duration": "1-2 hours",
                  "recommended_transport": "Taxi",
                  "additional_notes": "Grab a pair of glasses and a camera. Dress nicely and bring water."
                },
                ...
                {
                  "place_id": 4,
                  "name": "Downtown Dubai Park",
                  "details": "Visit another park or green space to enjoy the peaceful environment.",
                  "timing": "1:00 PM to 4:45 PM",
                  "Famous Activity": "Swimming",
                  "total_duration": "4-5 hours",
                  "recommended_transport": "Walking",
                  "additional_notes": "Grab a snack or lunch at Dubai Mall or nearby cafes. Dress comfortably and bring water, especially for outdoor activities."
                }
              ]'''

    full_prompt = (preferences + "Plan a series of events that will provide a memorable experience for the group. The group is interested in exploring the places listed below.\n Selected Places:" + chosen_locs + "\nReturn a smart plan in the form of a 'JSON list of the same structure' containing the events and activities that the group should participate in. Ensure that the plan includes the total number of places to visit, the locations, details, timings, famous activities, total duration, recommended transport, and additional notes." + template)

    response = invoke_llm("You are an event planner and your task is to plan a series of events for a group of tourists.", full_prompt)
    parsed = response.split("```")[1].strip()
    schedule = json.loads(parsed)
    return schedule

app = Flask(__name__)
CORS(app)
CACHE_FILE = "existing_places.json"

def read_locations_cache():
    with open(CACHE_FILE, "r") as f:
        return json.load(f)

def cache_location(loc_name):
    locs = read_locations_cache()
    if {"name": loc_name} not in locs:
        locs.append({"name": loc_name})

    with open(CACHE_FILE, "w") as f:
        json.dump(locs, f, indent=4)

@app.route("/api/places", methods=["GET"])
def get_locations():
    with open(CACHE_FILE, "r") as f:
        locs = json.load(f)
    names = [loc["name"] for loc in locs]
    return jsonify(names)

@app.route('/api/top-places', methods=['POST'])
def recommend_places():
    db = ArangoClient(hosts="https://72f3bc481376.arangodb.cloud:8529").db(username="root", password="jznyCFlCYCwMCH5q2wV8", verify=True)
    graph_obj = nxadb.Graph(name="GraphRec", db=db)

    cached = read_locations_cache()
    known_locs = [loc["name"] for loc in cached]
    print(known_locs)

    req_data = request.json
    target_loc = req_data['destination']

    if not req_data:
        return jsonify({"error": "No user data provided"}), 400

    results, updated_graph = filter_recommendations(req_data, known_locs, graph_obj)
    cache_location(target_loc)
    graph_obj = updated_graph

    return jsonify({"places": results})

@app.route("/api/event-planner", methods=["POST"])
def plan_itinerary():
    req_data = request.get_json()

    if not req_data:
        return jsonify({"error": "No data provided"}), 400

    chosen = req_data.get("selectedPlaces", "")
    prefs = req_data.get("userInput", "")

    if not chosen or not prefs:
        return jsonify({"error": "Missing required parameters: selectedPlaces or userInput"}), 400

    try:
        print(chosen)
        print(prefs)
        schedule = generate_itinerary(chosen, prefs)
        print(schedule)
        return jsonify(schedule), 200
    except Exception as err:
        return jsonify({"error": str(err)}), 500

if __name__ == '__main__':
    port = 5000
    print(f"Starting Flask server on port {port}")
    app.run(debug=True, port=port, host='0.0.0.0')
