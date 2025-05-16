const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const { exec } = require("child_process");
const fs = require("fs");
const nodemailer = require("nodemailer");

const app = express();
app.use(cors({ origin: "http://localhost:6001" }));
app.use(express.json());

const baseDir = path.resolve(__dirname, "..");
const latestDir = path.join(baseDir, "yolov5", "runs", "detect", "latest");

app.use("/latest", express.static(latestDir, {
    setHeaders: (res) => {
        res.set("Access-Control-Allow-Origin", "*");
    }
}));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(baseDir, "uploads");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "aparna4siva@gmail.com",
        pass: "allj oafg bsik gbsp"
    }
});

// Mock vehicle owner email database
const vehicleOwners = {
    "TN01AB1234": "aparna4siva@gmail.com",
    "KA02CD5678": "owner2@example.com",
    "MH03EF9012": "owner3@example.com"
};

app.post("/detect", upload.single("file"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const { vehicleNumber } = req.body;
    const inputImagePath = path.join(baseDir, "uploads", req.file.filename);
    const outputDir = path.join(baseDir, "yolov5", "runs", "detect", "latest");
    const detectedImagePath = `latest/${req.file.filename}`;

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const pythonCommand = `"C:\\Users\\aparn\\AppData\\Local\\Programs\\Python\\Python312\\python.exe" "C:\\SE_combined\\react_project\\yolov5\\detect.py" --weights "C:\\SE_combined\\react_project\\yolov5\\runs\\train\\exp11\\weights\\best.pt" --source "${inputImagePath}" --save-txt --save-conf --project "C:\\SE_combined\\react_project\\yolov5\\runs\\detect" --name latest --exist-ok`;

    exec(pythonCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return res.status(500).json({ error: "Detection failed!" });
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
        }

        const fullPath = path.join(baseDir, "yolov5", "runs", "detect", "latest", req.file.filename);
        if (!fs.existsSync(fullPath)) {
            return res.status(500).json({ error: "Detected image file not found!" });
        }

        const labelsPath = path.join(baseDir, "yolov5", "runs", "detect", "latest", "labels", req.file.filename.replace(".jpg", ".txt"));
        let violationType = "No Violation Detected";
        let fine = 0;

        if (fs.existsSync(labelsPath)) {
            const labelsContent = fs.readFileSync(labelsPath, "utf-8");
            const lines = labelsContent.split("\n");

            let hasNoHelmet = false;
            let hasNoSeatbelt = false;

            for (const line of lines) {
                if (line.trim() === "") continue;

                const [classId] = line.split(" ");
                if (classId === "4") {
                    hasNoHelmet = true;
                } else if (classId === "5") {
                    hasNoSeatbelt = true;
                }
            }

            if (hasNoHelmet) {
                violationType = "No Helmet";
                fine = 500;
            } else if (hasNoSeatbelt) {
                violationType = "Without Seatbelt";
                fine = 300;
            }
        }

        console.log(`🚨 Notification Sent 🚨`);
        console.log(`Violation Type: ${violationType}`);
        console.log(`Fine: ₹${fine}`);
        console.log(`Vehicle Number: ${vehicleNumber}`);

        // Get the owner's email from the database
        const ownerEmail = vehicleOwners[vehicleNumber] || "defaultowner@example.com";

        const mailOptions = {
            from: "aparna4siva@gmail.com",
            to: ownerEmail,
            subject: "Traffic Violation Alert",
            html: `
                <h2>Traffic Violation Detected</h2>
                <p><strong>Violation Type:</strong> ${violationType}</p>
                <p><strong>Fine:</strong> ₹${fine}</p>
                <p><strong>Vehicle Number:</strong> ${vehicleNumber}</p>
                <p>Click the link below to pay your fine:</p>
                <a href="http://localhost:3001/payment?fine=${fine}&vehicleNumber=${vehicleNumber}" target="_blank">Go to Payment Portal</a>
            `
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error("Error sending email:", err);
            } else {
                console.log("Email sent:", info.response);
            }
        });

        res.json({
            imagePath: `http://localhost:5001/${detectedImagePath}`,
            violationType: violationType,
            fine: fine,
            vehicleNumber: vehicleNumber
        });
    });
});

const PORT = 5001;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
