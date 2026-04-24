"""投诉信/起诉状一键生成"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from database import get_db
from db_models import GeneratedDocument, User
from middleware.auth_middleware import get_optional_user, get_current_user
from services.doc_gen_service import generate_document
import uuid

router = APIRouter(prefix="/api/documents", tags=["documents"])

DOC_TYPES = {"complaint_letter": "投诉信", "lawsuit_petition": "起诉状（小额诉讼）"}


class DocGenerateRequest(BaseModel):
    doc_type: str
    form_data: dict


@router.post("/generate", status_code=201)
async def generate_doc(
    req: DocGenerateRequest,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    if req.doc_type not in DOC_TYPES:
        raise HTTPException(status_code=400, detail=f"不支持的文档类型，支持：{list(DOC_TYPES.keys())}")

    content = await generate_document(req.doc_type, req.form_data)

    doc = GeneratedDocument(
        id=str(uuid.uuid4()),
        user_id=user.id if user else None,
        doc_type=req.doc_type,
        form_data=req.form_data,
        content=content,
    )
    db.add(doc)
    await db.commit()

    return {
        "doc_id": doc.id,
        "doc_type": req.doc_type,
        "doc_type_name": DOC_TYPES[req.doc_type],
        "content": content,
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
    }


@router.get("/my")
async def my_documents(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(GeneratedDocument)
        .where(GeneratedDocument.user_id == user.id)
        .order_by(desc(GeneratedDocument.created_at))
        .limit(20)
    )
    docs = result.scalars().all()
    return {"documents": [
        {"id": d.id, "doc_type": d.doc_type, "doc_type_name": DOC_TYPES.get(d.doc_type, d.doc_type),
         "created_at": d.created_at.isoformat() if d.created_at else None,
         "tenant_name": d.form_data.get("tenant_name", "")}
        for d in docs
    ]}


@router.get("/{doc_id}")
async def get_document(
    doc_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(GeneratedDocument).where(GeneratedDocument.id == doc_id, GeneratedDocument.user_id == user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")
    return {
        "id": doc.id, "doc_type": doc.doc_type, "form_data": doc.form_data,
        "content": doc.content, "created_at": doc.created_at.isoformat() if doc.created_at else None
    }
