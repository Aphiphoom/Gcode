# AP Cabinet Pro — การปล่อยเวอร์ชัน

หน้าเข้าสู่ระบบอ่านข้อมูลล่าสุดจาก `https://aphiphoom.github.io/Gcode/version.json` ทุกครั้งที่เปิดหน้า โดยไม่ฝังหมายเลขเวอร์ชันไว้ในหน้าล็อกอิน

เมื่อปล่อยรุ่นใหม่:

1. สร้าง GitHub Release tag ให้ตรงกับเวอร์ชัน เช่น `v2.0.176`
2. แนบไฟล์ RBZ เป็น asset ชื่อเดียวกับ `file_name` ใน `version.json`
3. แก้ `latest_version`, `file_name`, `download_url`, `release_url` และ `notes` ใน `version.json`
4. Push `version.json` ขึ้น branch ที่ GitHub Pages ใช้

ไฟล์ `version.json` และข้อมูลเวอร์ชันเป็นข้อมูลสาธารณะได้ ส่วน token, service-role key และข้อมูลสมาชิกต้องไม่ใส่ในไฟล์นี้
