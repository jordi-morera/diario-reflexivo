#!/bin/bash
set -e
echo "🚀 Iniciando setup de Diario Reflexivo..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r ../requirements.txt
echo "✅ Backend listo"
cd ../frontend
npm install
echo "✅ Frontend listo"
echo "🎉 Setup completo!"
