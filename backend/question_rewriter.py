from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI

rewriter_llm = ChatGoogleGenerativeAI(
    model = "gemini-3.5-flash-lite",
    temperature=0
)

rewrite_prompt = ChatPromptTemplate.from_template(
    """
    Rewrite the user's latest question into a standalone question.

    Use the conversation history to resolve references such as:
    "it", "they", "this", "that", "the company", "the place" etc.

    If the question is already standalone, return it unchanged.

    Do not answer the question.
    Return only the rewritten question.

    Conversation History:
    {chat_history}

    Latest Question:
    {question}

    Standalone Question:
    """
)

rewrite_chain = (rewrite_prompt
                 |rewriter_llm
                 |StrOutputParser()
                 )


def needs_rewriting(question, chat_history):

    if not chat_history:
        return False

    follow_up_words = [
        "it",
        "they",
        "them",
        "this",
        "that",
        "these",
        "those",
        "its",
        "their",
        "he",
        "she",
        "his",
        "her"
    ]

    words = question.lower().split()

    return any(word.strip("?,.!") in follow_up_words for word in words)

def rewrite_question(question,chat_history):

    if not needs_rewriting(question, chat_history):
        return question
    
    standalone_question = rewrite_chain.invoke({
        "question":question,
        "chat_history":chat_history
    })

    return str(standalone_question)