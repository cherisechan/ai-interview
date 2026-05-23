import os
import json
import numpy as np
from openai import OpenAI
from dotenv import load_dotenv
import re

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def chunk_text(text: str, chunk_size: int = 120, overlap: int = 30) -> list[str]:
    words = text.split()
    chunks = []

    step = chunk_size - overlap

    for i in range(0, len(words), step):
        chunk = " ".join(words[i:i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)

    return chunks


def embed_texts(texts: list[str]) -> list[list[float]]:
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=texts
    )

    return [item.embedding for item in response.data]


def cosine_similarity(a, b):
    a = np.array(a)
    b = np.array(b)

    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))


def retrieve_top_chunks(job_description: str, query: str, top_k: int = 5) -> list[str]:
    chunks = chunk_text(job_description)
    chunk_embeddings = embed_texts(chunks)
    query_embedding = embed_texts([query])[0]

    scored_chunks = []

    for chunk, embedding in zip(chunks, chunk_embeddings):
        score = cosine_similarity(query_embedding, embedding)
        scored_chunks.append((score, chunk))

    scored_chunks.sort(reverse=True, key=lambda x: x[0])

    return [chunk for _, chunk in scored_chunks[:top_k]]

def parse_llm_json(content: str):
    # Remove markdown code ``
    cleaned = re.sub(r"^```json\s*", "", content.strip())
    cleaned = re.sub(r"^```\s*", "", cleaned.strip())
    cleaned = re.sub(r"\s*```$", "", cleaned.strip())

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {"raw_feedback": content}

def generate_feedback(job_description: str, question: str, answer: str):
    retrieval_query = f"""
    Interview question:
    {question}

    Candidate answer:
    {answer}

    Retrieve the job requirements, responsibilities, skills and behavioural expectations most relevant to this answer.
    """

    retrieved_chunks = retrieve_top_chunks(
        job_description=job_description,
        query=retrieval_query,
        top_k=5
    )

    context = "\n\n".join(retrieved_chunks)

    prompt = f"""
You are an expert interview coach.

Evaluate the candidate's answer against the retrieved job description context.

Retrieved job description context:
{context}

Interview question:
{question}

Candidate answer:
{answer}

Return valid JSON only. Do not wrap it in markdown code fences:
{{
  "overall_score": 0,
  "role_alignment_score": 0,
  "technical_depth_score": 0,
  "communication_score": 0,
  "matched_requirements": [],
  "missing_keywords": [],
  "strengths": [],
  "weaknesses": [],
  "improved_answer": "",
  "next_steps": []
}}
"""

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2
    )

    content = response.choices[0].message.content

    feedback = parse_llm_json(content)
    return {
        "retrieved_chunks": retrieved_chunks,
        "feedback": feedback
    }