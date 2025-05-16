import React, { useState } from "react";
import axios from "axios";

function App() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [vehicleNumber, setVehicleNumber] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [violationType, setViolationType] = useState("");
    const [fine, setFine] = useState(0);
    const [notification, setNotification] = useState("");

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    const handleUpload = async () => {
        if (!selectedFile || !vehicleNumber) {
            alert("Please select a file and enter vehicle number.");
            return;
        }

        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("vehicleNumber", vehicleNumber);

        try {
            const response = await axios.post("http://localhost:5001/detect", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            setImageUrl(response.data.imagePath);
            setViolationType(response.data.violationType);
            setFine(response.data.fine);
            setNotification("🚨 Notification Sent: Email delivered to the vehicle owner!");

        } catch (error) {
            console.error("Error uploading file:", error);
            alert("Detection failed!");
        }
    };

    return (
        <div style={{ textAlign: "center", marginTop: "20px", padding: "20px" }}>
            <h1>Traffic Violation Detection</h1>

            <input type="file" onChange={handleFileChange} />
            <input type="text" placeholder="Enter Vehicle Number" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} />
            <button onClick={handleUpload}>Upload and Detect</button>

            <h2>Violation Details</h2>
            <p>{notification}</p>
            <p>Violation Type: {violationType}</p>
            <p>Fine: ₹{fine}</p>

            {imageUrl && <img src={imageUrl} alt="Detected" style={{ maxWidth: "300px" }} />}
        </div>
    );
}

export default App;
