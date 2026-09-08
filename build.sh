#!/usr/bin/env bash

set -e

echo "Installing Python dependencies..."
pip install -r backend/requirements.txt

echo "Installing frontend dependencies..."
cd frontend
npm ci

echo "Building React frontend..."
npm run build

cd ..

echo "Preparing FastAPI static files..."
rm -rf backend/static
mkdir -p backend/static
cp -r frontend/dist/. backend/static/

echo "Build completed successfully!"