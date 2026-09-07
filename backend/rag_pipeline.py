from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma

from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

class RAGPipeline:

    def __init__(self,pdf_paths):

        self.pdf_paths=pdf_paths #stores the PDF path inside the RAGPipeline object.

        docs= []

        for pdf_path in pdf_paths:
            loader = PyPDFLoader(pdf_path)
            pdf_doc = loader.load()
            docs.extend(pdf_doc)

        

        for doc in docs: #loop over every page in docs
            doc.page_content = " ".join(doc.page_content.split())



        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        self.chunks = text_splitter.split_documents(docs)


        self.embeddings = GoogleGenerativeAIEmbeddings(model="gemini-embedding-001")

        self.vectorstore = Chroma.from_documents(documents=self.chunks, embedding=self.embeddings)

        self.retriever = self.vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": 3})


        self.prompt = ChatPromptTemplate.from_template(
        """
        You are an assistant for question-answering tasks. Use the following pieces of retrieved context to answer the question. If you don't know the answer, just say that you don't know. Use three sentences maximum and keep the answer concise.
        Question: {question}
        Context: {context}
        Answer:
        """
        )

        self.llm = ChatGoogleGenerativeAI(
            model="gemini-3.5-flash-lite",
            temperature=1
        )

        self.rag_chain = ({"context":self.retriever | self.format_docs, "question":RunnablePassthrough()}
             |self.prompt
             |self.llm
             |StrOutputParser()
             ) #retriever handles converting the qn to embedding and doing similarity search internally
             #This expression uses LangChain's Runnable/LCEL system. The result assigned to rag_chain is a Runnable object.


    @staticmethod #-> means the function doesn't need the object's self.
    def format_docs(docs):
        return "\n".join(doc.page_content for doc in docs)

    def ask(self,question):
        return self.rag_chain.invoke(question) #invoke() function is provided by LangChain's Runnable interface.




