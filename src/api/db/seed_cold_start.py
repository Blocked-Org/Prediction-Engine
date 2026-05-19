import uuid
import random
from datetime import datetime, timedelta

from sqlalchemy import text
from database import SessionLocal, tenant_context

def generate_synthetic_data():
    db = SessionLocal()
    
    try:
        # 1. Pre-generate the new Tenant ID so we can set the RLS context BEFORE inserting
        # This allows 'app_user' to insert the tenant because the RLS policy requires 
        # the inserted ID to match the current_setting('app.current_tenant_id').
        tenant_id = str(uuid.uuid4())
        
        # Enable RLS context for this tenant
        token = tenant_context.set(tenant_id)
        
        print(f"Seeding synthetic data for new tenant: Mushroom Ghor (ID: {tenant_id})")
        
        # Insert the new Tenant
        db.execute(
            text("INSERT INTO tenants (id, company_name) VALUES (:id, :company_name)"),
            {"id": tenant_id, "company_name": "Mushroom Ghor"}
        )
        
        # 2. Insert Channels
        channels = [
            {"id": str(uuid.uuid4()), "name": "Meta Ads"},
            {"id": str(uuid.uuid4()), "name": "Google Ads"},
            {"id": str(uuid.uuid4()), "name": "Organic"},
        ]
        
        for c in channels:
            db.execute(
                text("INSERT INTO channels (id, tenant_id, channel_name) VALUES (:id, :tenant_id, :channel_name)"),
                {"id": c["id"], "tenant_id": tenant_id, "channel_name": c["name"]}
            )
            
        # 3. Insert Campaigns under the "Agriculture > Edible Fungi" category
        campaign_ids = {}
        for c in channels:
            campaign_id = str(uuid.uuid4())
            campaign_ids[c["name"]] = campaign_id
            
            db.execute(
                text("""
                    INSERT INTO campaigns (id, tenant_id, channel_id, campaign_name, target_interest, status)
                    VALUES (:id, :tenant_id, :channel_id, :campaign_name, :target_interest, 'active')
                """),
                {
                    "id": campaign_id,
                    "tenant_id": tenant_id,
                    "channel_id": c["id"],
                    "campaign_name": f"{c['name']} - Mushroom Sales",
                    "target_interest": "Agriculture > Edible Fungi"
                }
            )
        
        # 4. Generate 90 days of daily historical records
        # "Ensure the daily timestamps decrement from the current date over 90 consecutive days."
        today = datetime.now().date()
        records = []
        
        for day_offset in range(90):
            current_date = today - timedelta(days=day_offset)
            
            # --- Meta Ads Constraints ---
            # Spend: BDT 500 to 1,500 daily variance
            meta_spend = random.uniform(500, 1500)
            # Impressions derived from CPM (BDT 230 baseline)
            meta_impressions = int((meta_spend / 230.0) * 1000)
            # Clicks derived from CTR (1.44% average)
            meta_clicks = int(meta_impressions * 0.0144)
            # Conversions: 2% of clicks
            meta_conversions = int(meta_clicks * 0.02)
            # Revenue: Conversions * BDT 500 (average order value)
            meta_revenue = meta_conversions * 500.0
            
            records.append({
                "date": current_date,
                "tenant_id": tenant_id,
                "campaign_id": campaign_ids["Meta Ads"],
                "spend": round(meta_spend, 2),
                "impressions": meta_impressions,
                "clicks": meta_clicks,
                "conversions": meta_conversions,
                "revenue": round(meta_revenue, 2)
            })
            
            # --- Google Ads Constraints ---
            # Spend: BDT 300 to 1,000 daily variance
            google_spend = random.uniform(300, 1000)
            # Clicks = spend / CPC (averages BDT 45)
            google_clicks = int(google_spend / 45.0)
            # CTR is 2.0%, meaning Impressions = Clicks / 0.02
            google_impressions = int(google_clicks / 0.02)
            # Conversions: 5% of clicks (higher search intent)
            google_conversions = int(google_clicks * 0.05)
            # Revenue: Conversions * BDT 500
            google_revenue = google_conversions * 500.0
            
            records.append({
                "date": current_date,
                "tenant_id": tenant_id,
                "campaign_id": campaign_ids["Google Ads"],
                "spend": round(google_spend, 2),
                "impressions": google_impressions,
                "clicks": google_clicks,
                "conversions": google_conversions,
                "revenue": round(google_revenue, 2)
            })
            
            # --- Organic Constraints ---
            # No spend, varying traffic based on organic reach
            organic_impressions = random.randint(200, 800)
            organic_clicks = random.randint(10, 40)
            organic_conversions = random.randint(0, 3)
            organic_revenue = organic_conversions * 500.0
            
            records.append({
                "date": current_date,
                "tenant_id": tenant_id,
                "campaign_id": campaign_ids["Organic"],
                "spend": 0.00,
                "impressions": organic_impressions,
                "clicks": organic_clicks,
                "conversions": organic_conversions,
                "revenue": round(organic_revenue, 2)
            })
            
        # Bulk insert the 90 days (270 records total)
        for r in records:
            db.execute(
                text("""
                    INSERT INTO daily_ad_performance 
                    (date, tenant_id, campaign_id, spend, impressions, clicks, conversions, revenue)
                    VALUES (:date, :tenant_id, :campaign_id, :spend, :impressions, :clicks, :conversions, :revenue)
                """),
                r
            )
            
        db.commit()
        print(f"Successfully inserted {len(records)} time-series records into daily_ad_performance.")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding data: {e}")
    finally:
        db.close()
        # Ensure we always clean up the ContextVar
        if 'token' in locals():
            tenant_context.reset(token)

if __name__ == "__main__":
    generate_synthetic_data()
