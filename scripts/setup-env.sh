#!/bin/bash

# Setup script for modernization toolset environment variables

echo "🔧 Setting up environment variables for Modernization Toolset"
echo ""

# Check if .env file exists
if [ -f ".env" ]; then
    echo "✅ .env file already exists"
    echo "Current configuration:"
    cat .env
    echo ""
    read -p "Do you want to update the existing .env file? (y/n): " update_env
    if [[ $update_env != "y" && $update_env != "Y" ]]; then
        echo "Keeping existing configuration."
        exit 0
    fi
fi

# Get LLM endpoint
echo "Enter your LLM API endpoint (default: https://api.openai.com/v1):"
read -r llm_endpoint
if [ -z "$llm_endpoint" ]; then
    llm_endpoint="https://api.openai.com/v1"
fi

# Get API key
echo "Enter your LLM API key:"
read -r -s llm_api_key
if [ -z "$llm_api_key" ]; then
    echo "❌ API key is required!"
    exit 1
fi

# Create .env file
cat > .env << EOF
LLM_ENDPOINT=$llm_endpoint
LLM_API_KEY=$llm_api_key
EOF

echo ""
echo "✅ .env file created successfully!"
echo "🚀 You can now run the modernization toolset commands:"
echo ""
echo "   modernize cve ./src"
echo "   modernize ast ./src --output ast-analysis.json"
echo "   modernize cloud-readiness ./src --cloud-provider aws"
echo ""
echo "📝 Note: The .env file is automatically loaded by the CLI." 