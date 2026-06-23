from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough, RunnableParallel
from langchain_core.output_parsers import StrOutputParser
from llm import get_llm
from retriever import get_retriever
from operator import itemgetter

def format_docs(docs):
    formatted = []
    for doc in docs:
        speaker = doc.metadata.get("speaker", "Unknown")
        formatted.append(f"{speaker}: {doc.page_content}")
    return "\n\n".join(formatted)

def get_rag_chain(meeting_id: str):
    llm = get_llm()
    retriever = get_retriever(meeting_id)
    
    system_prompt = (
        "You are an AI Meeting Assistant.\n"
        "Answer only from the provided meeting transcript excerpts.\n"
        "If the answer is not present, say: 'I could not find that information in the meeting transcript.'\n"
        "Never invent information.\n"
        "Always mention speakers when available.\n"
        "\n"
        "Transcript Excerpts:\n{context}"
    )
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}"),
    ])
    
    # RAG chain using LCEL
    rag_chain_from_docs = (
        RunnablePassthrough.assign(context=(lambda x: format_docs(x["context"])))
        | prompt
        | llm
        | StrOutputParser()
    )
    
    rag_chain = RunnableParallel(
        {"context": itemgetter("input") | retriever, "input": itemgetter("input")}
    ).assign(answer=rag_chain_from_docs)
    
    return rag_chain
