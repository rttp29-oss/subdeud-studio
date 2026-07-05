
export const maxDuration = 60; // ขอขยายเวลาประมวลผลเป็น 60 วินาทีimport { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import fs from "fs";
import path from "path";
import os from "os";

export async function POST(request: Request) {
  let tempFilePath = "";
  try {
    const formData = await request.formData();
    const file = formData.get("video") as File;

    if (!file) return NextResponse.json({ error: "ไม่พบไฟล์วิดีโอ" }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "API Key ไม่ถูกต้อง" }, { status: 500 });

    const buffer = Buffer.from(await file.arrayBuffer());
    tempFilePath = path.join(os.tmpdir(), `temp_video_${Date.now()}.mp4`);
    fs.writeFileSync(tempFilePath, buffer);

    const fileManager = new GoogleAIFileManager(apiKey);
    const uploadResponse = await fileManager.uploadFile(tempFilePath, { mimeType: file.type || "video/mp4", displayName: "SubDeud_Video" });

    let fileState = await fileManager.getFile(uploadResponse.file.name);
    while (fileState.state === "PROCESSING") {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      fileState = await fileManager.getFile(uploadResponse.file.name);
    }
    if (fileState.state === "FAILED") return NextResponse.json({ error: "AI ประมวลผลล้มเหลว" }, { status: 500 });

    const genAI = new GoogleGenerativeAI(apiKey);
    // ใช้ Model รุ่น Pro เพื่อการวิเคราะห์ที่แม่นยำขึ้น (ถ้าโควต้าไม่พอ สามารถเปลี่ยนกลับเป็น flash ได้ครับ)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 

    // 🌟 คำสั่งขั้นเด็ดขาด (Master Prompt) สำหรับความแม่นยำระดับเสียง
    const prompt = `คุณคือผู้เชี่ยวชาญด้าน Audio-to-Text Synchronization ระดับโลก
    กรุณาถอดเสียงจากวิดีโอนี้เป็นภาษาไทย โดยต้องทำตามกฎเหล็กนี้อย่างเคร่งครัด:
    
    1. **ความยาว:** หั่นแบ่งซีนให้สั้นที่สุด เพียง 3-5 คำต่อซีนเท่านั้น ห้ามเกินเด็ดขาด!
    2. **ความแม่นยำของเวลา (CRITICAL):** เวลา (Timestamp) ต้องเริ่มนับวินาทีที่ "เปล่งเสียงคำแรก" และสิ้นสุดในวินาทีที่ "พูดคำสุดท้ายจบ" ของซีนนั้นๆ
    3. **ห้ามมั่วเวลา:** หากมีช่วงเงียบ (Silence) หรือหยุดหายใจ ห้ามนำเวลานั้นมารวมในซีน ให้ตัดขึ้นซีนใหม่เมื่อมีเสียงพูดเท่านั้น
    4. **ความถูกต้องของคำ:** ถอดเสียงตามที่ได้ยินเป๊ะๆ ห้ามสรุป ห้ามแต่งประโยคใหม่ ห้ามใส่คำเชื่อมที่ไม่ได้พูด
    5. คำต้องติดกัน ห้ามเว้นวรรคใน text
    
    ส่งข้อมูลเป็น JSON Array เท่านั้น รูปแบบ:
    [
      { "id": 1, "time": "00:00.0 - 00:01.5", "text": "ทุกคนที่หั่นผัก" },
      { "id": 2, "time": "00:01.6 - 00:03.2", "text": "ในครัวช้าและ" }
    ]`;

    const response = await model.generateContent([
      { fileData: { mimeType: uploadResponse.file.mimeType, fileUri: uploadResponse.file.uri } },
      prompt
    ]);

    let textResult = response.response.text().replace(/```json/gi, "").replace(/```/gi, "").trim();
    let jsonResult = JSON.parse(textResult);

    return NextResponse.json({ scenes: jsonResult });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
  }
}