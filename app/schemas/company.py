from pydantic import BaseModel

class CompanyBase(BaseModel):
    name: str
    image: str

class CompanyCreate(CompanyBase):
    pass

class CompanyResponse(CompanyBase):
    id: int

    class Config:
        from_attributes = True