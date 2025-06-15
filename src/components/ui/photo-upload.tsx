"use client";

import { useState, useRef } from 'react';
import { Button } from './button';
import { Card, CardContent } from './card';
import { Upload, Camera, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhotoUploadProps {
  onPhotoSelected: (photoFile: string) => void;
  isUploading?: boolean;
  className?: string;
}

export function PhotoUpload({ onPhotoSelected, isUploading = false, className }: PhotoUploadProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setSelectedPhoto(result);
        onPhotoSelected(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const clearPhoto = () => {
    setSelectedPhoto(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn("w-full", className)}>
      <Card className={cn(
        "border-2 border-dashed transition-all duration-200",
        isDragging && "border-pink-400 bg-pink-50/10",
        selectedPhoto && "border-solid border-slate-600"
      )}>
        <CardContent className="p-6">
          {selectedPhoto ? (
            <div className="relative">
              <img
                src={selectedPhoto}
                alt="Selected photo"
                className="w-full h-64 object-cover rounded-lg"
              />
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2 bg-slate-800 border-slate-600"
                onClick={clearPhoto}
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
              </Button>
              {isUploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                  <div className="text-center text-white">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p>Analyzing your photo...</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              className={cn(
                "text-center py-12 cursor-pointer",
                isDragging && "scale-105"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={openFileDialog}
            >
              <div className="mx-auto mb-4 w-16 h-16 bg-pink-500/20 rounded-full flex items-center justify-center">
                <Upload className="h-8 w-8 text-pink-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Upload Your Photo
              </h3>
              <p className="text-slate-400 mb-4">
                Drag and drop your photo here, or click to select
              </p>
              <div className="flex flex-wrap gap-2 justify-center text-sm text-slate-500">
                <span>• Full body photos work best</span>
                <span>• Good lighting recommended</span>
                <span>• JPG, PNG formats supported</span>
              </div>
              <div className="mt-6 flex gap-3 justify-center">
                <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                  <Upload className="mr-2 h-4 w-4" />
                  Choose File
                </Button>
                <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                  <Camera className="mr-2 h-4 w-4" />
                  Take Photo
                </Button>
              </div>
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </CardContent>
      </Card>
    </div>
  );
}