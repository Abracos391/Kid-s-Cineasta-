import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Ensure /tmp/uploads exists
  const uploadsDir = "/tmp/uploads";
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Increase body size limit for base64 images
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Route to upload/save base64 images
  app.post("/api/upload-image", (req, res) => {
    try {
      const { base64Data, filename } = req.body;
      if (!base64Data) {
         res.status(400).json({ error: "Missing base64Data" });
         return;
      }

      // Strip content type header if present (e.g., "data:image/png;base64,")
      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let dataBuffer: Buffer;
      let ext = "png";

      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        if (mimeType.includes("jpeg") || mimeType.includes("jpg")) ext = "jpg";
        else if (mimeType.includes("webp")) ext = "webp";
        dataBuffer = Buffer.from(matches[2], 'base64');
      } else {
        dataBuffer = Buffer.from(base64Data, 'base64');
      }

      const safeFilename = filename 
        ? filename.replace(/[^a-zA-Z0-9.\-_]/g, '') 
        : `image_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;

      const filePath = path.join(uploadsDir, safeFilename);
      fs.writeFileSync(filePath, dataBuffer);

      res.json({ 
        success: true, 
        filename: safeFilename,
        url: `/uploads/${safeFilename}`
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Serve saved uploads
  app.use('/uploads', express.static(uploadsDir));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
