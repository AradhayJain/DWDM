from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Date, DateTime, ForeignKey, Text, Index
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

# ==========================================
# STAR SCHEMA
# ==========================================

class DimDate(Base):
    __tablename__ = "dim_date"

    date_id = Column(Integer, primary_key=True, index=True) # e.g. 20110901
    full_date = Column(Date, nullable=False, index=True)
    day = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    month_name = Column(String(10), nullable=False)
    quarter = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    weekday = Column(String(15), nullable=False)

    fact_sales = relationship("FactSales", back_populates="date")


class DimProduct(Base):
    __tablename__ = "dim_product"

    product_id = Column(Integer, primary_key=True, autoincrement=True)
    stock_code = Column(String(30), nullable=False, index=True)
    description = Column(String(255), nullable=False)
    price_band = Column(String(20), nullable=False)

    fact_sales = relationship("FactSales", back_populates="product")


class DimCustomer(Base):
    __tablename__ = "dim_customer"

    customer_id = Column(Integer, primary_key=True, index=True) # 0 for guest
    country = Column(String(60), nullable=False, index=True)
    region = Column(String(40), nullable=False, index=True)

    fact_sales = relationship("FactSales", back_populates="customer")


class FactSales(Base):
    __tablename__ = "fact_sales"

    sale_id = Column(Integer, primary_key=True, autoincrement=True)
    invoice_no = Column(String(30), nullable=False, index=True)
    date_id = Column(Integer, ForeignKey("dim_date.date_id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("dim_product.product_id"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("dim_customer.customer_id"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    revenue = Column(Float, nullable=False)

    date = relationship("DimDate", back_populates="fact_sales")
    product = relationship("DimProduct", back_populates="fact_sales")
    customer = relationship("DimCustomer", back_populates="fact_sales")


# ==========================================
# SNOWFLAKE SCHEMA (Normalized Hierarchies)
# ==========================================

class DimRegion(Base):
    __tablename__ = "snow_dim_region"

    region_id = Column(Integer, primary_key=True, autoincrement=True)
    region = Column(String(40), unique=True, nullable=False)

    countries = relationship("DimCountry", back_populates="region_rel")


class DimCountry(Base):
    __tablename__ = "snow_dim_country"

    country_id = Column(Integer, primary_key=True, autoincrement=True)
    country = Column(String(60), unique=True, nullable=False)
    region_id = Column(Integer, ForeignKey("snow_dim_region.region_id"), nullable=False)

    region_rel = relationship("DimRegion", back_populates="countries")
    customers = relationship("SnowCustomer", back_populates="country_rel")


class SnowCustomer(Base):
    __tablename__ = "snow_dim_customer"

    customer_id = Column(Integer, primary_key=True)
    country_id = Column(Integer, ForeignKey("snow_dim_country.country_id"), nullable=False)

    country_rel = relationship("DimCountry", back_populates="customers")
    fact_sales = relationship("SnowFactSales", back_populates="customer")


class DimPriceBand(Base):
    __tablename__ = "snow_dim_price_band"

    band_id = Column(Integer, primary_key=True, autoincrement=True)
    price_band = Column(String(20), unique=True, nullable=False)

    products = relationship("SnowProduct", back_populates="band_rel")


class SnowProduct(Base):
    __tablename__ = "snow_dim_product"

    product_id = Column(Integer, primary_key=True)
    stock_code = Column(String(30), nullable=False)
    description = Column(String(255), nullable=False)
    band_id = Column(Integer, ForeignKey("snow_dim_price_band.band_id"), nullable=False)

    band_rel = relationship("DimPriceBand", back_populates="products")
    fact_sales = relationship("SnowFactSales", back_populates="product")


class SnowFactSales(Base):
    __tablename__ = "snow_fact_sales"

    sale_id = Column(Integer, primary_key=True)
    invoice_no = Column(String(30), nullable=False)
    date_id = Column(Integer, ForeignKey("dim_date.date_id"), nullable=False)
    product_id = Column(Integer, ForeignKey("snow_dim_product.product_id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("snow_dim_customer.customer_id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    revenue = Column(Float, nullable=False)

    product = relationship("SnowProduct", back_populates="fact_sales")
    customer = relationship("SnowCustomer", back_populates="fact_sales")


# ==========================================
# PIPELINE EXECUTION & AUDIT
# ==========================================

class JobExecution(Base):
    __tablename__ = "pipeline_jobs"

    job_id = Column(String(50), primary_key=True)
    stage_id = Column(Integer, nullable=False, index=True)
    stage_name = Column(String(100), nullable=False)
    status = Column(String(20), default="pending", index=True) # pending, running, success, failed, waiting_input, skipped
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    duration_sec = Column(Float, default=0.0)
    parameters_json = Column(Text, nullable=True)
    metrics_json = Column(Text, nullable=True)
    logs = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    result_file = Column(String(255), nullable=True)
