# AI Shop System Data Templates

ไฟล์ชุดนี้ใช้เป็น template สำหรับ import เข้า Google Sheets หรือเปิดตรวจรูปแบบข้อมูลได้ทันที

## วิธีใช้

1. นำไฟล์ `.csv` แต่ละไฟล์ import เป็นชีตแยกกันใน Google Sheets
2. ให้ชื่อชีตตรงกับชื่อไฟล์:
   - `raw_products`
   - `processed_products`
   - `product_assets`
   - `content_plan`
   - `promotion_plan`
   - `sales_orders`
   - `ai_prompt_rules`
   - `error_memory`
   - `approved_examples`
3. ถ้าจะเริ่มจากข้อมูลจริง ให้ลบแถวตัวอย่างแล้วกรอกข้อมูลต่อได้เลย

## ค่าที่ควรรู้

- วันที่: ใช้ `YYYY-MM-DD`
- เวลา/วันเวลา: ใช้ `YYYY-MM-DD HH:mm:ss` หรือ ISO เช่น `2026-06-17T09:00:00+09:00`
- ตัวเลข: ห้ามใส่ comma คั่นหลักพัน
- Boolean: ใช้ `true` / `false`
- ช่องที่ว่างได้: ปล่อยว่างไว้ได้

## ลำดับข้อมูลแนะนำ

1. `raw_products`
2. `processed_products`
3. `product_assets`
4. `sales_orders`
5. `content_plan`
6. `promotion_plan`
7. `ai_prompt_rules`
8. `error_memory`
9. `approved_examples`

