import React, { useState } from 'react';
import './ImageUploader.css';

const ImageUploader = ({ onImagesSelected }) => {
    const [dragActive, setDragActive] = useState(false);
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const MAX_FILES = 10;

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        const files = [...e.dataTransfer.files];
        if (files && files.length > 0) {
            handleFiles(files);
        }
    };

    const handleChange = (e) => {
        e.preventDefault();
        const files = [...e.target.files];
        if (files && files.length > 0) {
            handleFiles(files);
        }
    };

    const handleFiles = (files) => {
        const imageFiles = Array.from(files).filter(file => {
            if (!file.type.startsWith('image/')) {
                alert('Lütfen sadece görsel dosyaları yükleyin.');
                return false;
            }
            if (file.size > MAX_FILE_SIZE) {
                alert(`${file.name} dosyası çok büyük. Maksimum 5MB yükleyebilirsiniz.`);
                return false;
            }
            return true;
        });

        if (imageFiles.length > MAX_FILES) {
            alert(`En fazla ${MAX_FILES} görsel yükleyebilirsiniz.`);
            imageFiles.length = MAX_FILES;
        }

        onImagesSelected(imageFiles);
    };

    return (
        <div className="upload-container">
            <form
                className={`upload-form ${dragActive ? "drag-active" : ""}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleChange}
                    className="file-input"
                />
                <div className="upload-content">
                    <p>Fotoğrafları sürükleyip bırakın veya seçmek için tıklayın</p>
                    <em>(Birden fazla fotoğraf seçebilirsiniz)</em>
                </div>
            </form>
        </div>
    );
};

export default ImageUploader; 