from rag.ingestion.embeddings import get_embedding_model
from rag.retrieval.retriever import cosine_similarity


def test_embedding_dimension_matches_model() -> None:
    model = get_embedding_model("sentence-transformers/all-MiniLM-L6-v2")
    vector = model.embed_query("stuck pipe mitigation at 3200 m")
    assert model.dimension == len(vector)
    assert model.dimension > 0


def test_similar_texts_have_higher_cosine_than_unrelated() -> None:
    model = get_embedding_model("sentence-transformers/all-MiniLM-L6-v2")
    stuck = model.embed_query("Stuck pipe occurred. Mitigation used circulation and WOB reduction.")
    similar = model.embed_query("What mitigation was used for stuck pipe?")
    unrelated = model.embed_query("Chocolate cake recipe with strawberries")
    assert cosine_similarity(stuck, similar) > cosine_similarity(stuck, unrelated)
