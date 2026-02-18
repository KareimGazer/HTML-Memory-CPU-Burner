# HTMLMemoryCPUBurner - Azure ACI Stress Testing Tool

A specialized web application designed for stress testing CPU and memory resources in Azure Container Instances. Perfect for demonstrating resource limits, monitoring, and auto-scaling in containerized environments.

![Azure](https://img.shields.io/badge/Azure-0078D4?style=flat&logo=microsoft-azure&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=flat&logo=nginx&logoColor=white)

## 🎯 Purpose

This application was created specifically for Azure Container Instances training and demonstrations. It allows you to:

- **Test ACI Resource Limits**: Push memory and CPU to their limits
- **Monitor Azure Metrics**: See real-time resource usage in Azure Portal
- **Demonstrate Auto-Restart**: Trigger container restarts by exceeding limits
- **Training Tool**: Perfect for Cloud courses and Kubernetes fundamentals

## ✨ Features

### 💾 Memory Testing
- Allocate memory in 100MB increments (0-1500MB)
- Quick-set buttons for common test values (0, 500, 1000, 1200, 1400, 1500 MB)
- Real memory allocation using Float64Arrays
- Visual feedback on memory usage

### ⚡ CPU Testing
- Spawn 0-4 independent CPU burner workers
- Each burner runs at 100% on one thread
- Perfect for testing single vCPU instances
- Real-time worker count display

### 📊 Monitoring
- Active CPU burners count
- Total memory allocated
- Number of memory arrays
- Runtime counter
- Visual status indicators

### 🎨 User Interface
- Azure-themed modern design
- Responsive layout
- Clear warnings about container limits
- Quick-access buttons for common test scenarios
- Real-time status updates

## 📦 Quick Start

### Build and Run Locally

```bash
# Build the image
docker build -t htmlmemorycpuburner:v1 .

# Run locally
docker run -d -p 8080:80 htmlmemorycpuburner:v1

# Access the app
open http://localhost:8080
```

### Deploy to Azure Container Instances

See [AZURE_DEPLOYMENT_GUIDE.md](AZURE_DEPLOYMENT_GUIDE.md) for complete step-by-step instructions.

**Quick Deploy:**
```bash
# Login to Azure
az login

# Create resource group
az group create --name course3-rg --location eastus

# Create ACR
az acr create --resource-group course3-rg --name course3acr --sku Basic

# Build and push
az acr build --registry course3acr --image htmlmemorycpuburner:v1 .

# Enable admin user
az acr update --name course3acr --admin-enabled true

# Deploy to ACI
az container create \
  --resource-group course3-rg \
  --name course3aci \
  --image course3acr.azurecr.io/htmlmemorycpuburner:v1 \
  --registry-login-server course3acr.azurecr.io \
  --registry-username $(az acr credential show --name course3acr --query username -o tsv) \
  --registry-password $(az acr credential show --name course3acr --query passwords[0].value -o tsv) \
  --dns-name-label course3-burner \
  --ports 80 \
  --cpu 1 \
  --memory 1.5
```

## 🧪 Testing Scenarios

### Scenario 1: CPU Spike Test
1. Set CPU Burners to **1**
2. Click **Apply Settings**
3. Wait 2-3 minutes
4. Check Azure Metrics → CPU Usage should be ~100%

### Scenario 2: Memory Allocation Test
1. Click **500 MB** quick button
2. Click **Apply Settings**
3. Wait 2-3 minutes
4. Check Azure Metrics → Memory Usage should increase by ~500MB

### Scenario 3: Progressive Memory Test (Crash Test)
1. Start at 0 MB
2. Every 5 minutes, click next button:
   - 0 min: **0 MB**
   - 5 min: **500 MB** → Apply
   - 10 min: **1000 MB** → Apply
   - 15 min: **1200 MB** → Apply
   - 20 min: **1400 MB** → Apply (near limit)
   - 25 min: **1500 MB** → Apply (likely triggers restart)
3. Monitor Azure Portal for container restart event

### Scenario 4: Combined Stress Test
1. Set CPU Burners to **2**
2. Set Memory to **1000 MB**
3. Click **Apply Settings**
4. Monitor both CPU and Memory metrics simultaneously

## 📊 Expected Metrics Behavior

| Action | Expected Azure Metric | Time to Appear |
|--------|----------------------|----------------|
| 1 CPU Burner | ~100% CPU Usage | 2-3 minutes |
| 500MB Allocation | +500MB Memory | 2-3 minutes |
| 1500MB Allocation | Container Restart | 1-2 minutes |
| Stop & Release | Return to baseline | 2-3 minutes |

## 🎓 Educational Use Cases

### For Instructors
- Demonstrate container resource limits
- Show Azure monitoring and metrics
- Teach about OOM (Out of Memory) scenarios
- Illustrate container restart policies
- Practice with Bicep/ARM templates

### For Students
- Hands-on experience with resource constraints
- Understanding container behavior under stress
- Learning Azure monitoring tools
- Practice with container deployments
- Real-world troubleshooting scenarios

## 📋 Azure ACI Requirements

This application is optimized for:
- **CPU**: 1 vCPU (can test with up to 4 cores)
- **Memory**: 1.5 GiB (1536 MB)
- **OS**: Linux (Ubuntu 22.04 LTS)
- **Port**: 80 (TCP)
- **Restart Policy**: Always

## 🔍 Monitoring in Azure

### View Metrics
1. Navigate to Container Instance in Azure Portal
2. Click **Metrics** under Monitoring
3. Add metrics:
   - CPU Usage (%)
   - Memory Usage (bytes)
4. Set time range to "Last 30 minutes"
5. Observe changes as you adjust load

### View Logs
```bash
# Azure CLI
az container logs --resource-group <rg-name> --name <container-name>

# Portal
Container Instance → Containers → Logs
```

### Log Analytics Queries
```kql
ContainerInstanceLog_CL
| where TimeGenerated > ago(1h)
| where Message contains "Allocating"
| project TimeGenerated, Message
```

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│     Azure Container Instance        │
│  ┌───────────────────────────────┐  │
│  │      Nginx (Alpine)           │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │   index.html            │  │  │
│  │  │  - Web Interface        │  │  │
│  │  │  - JavaScript Workers   │  │  │
│  │  │  - Memory Allocation    │  │  │
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
│                                     │
│  Resources:                         │
│  • CPU: 1 vCPU                     │
│  • Memory: 1.5 GiB                 │
│  • Port: 80                        │
└─────────────────────────────────────┘
              │
              │ Metrics & Logs
              ▼
┌─────────────────────────────────────┐
│    Log Analytics Workspace          │
│  • Container Logs                   │
│  • Metrics                          │
│  • Events (Restarts, OOM)          │
└─────────────────────────────────────┘
```

## 📁 Project Structure

```
htmlmemorycpuburner/
├── Dockerfile                      # Container build instructions
├── index.html                      # Web application
├── .dockerignore                   # Docker build exclusions
├── README.md                       # This file
├── AZURE_DEPLOYMENT_GUIDE.md      # Complete deployment guide
├── aci-deployment.bicep           # Bicep template
└── aci-deployment.parameters.json # Bicep parameters
```

## 🔧 Technical Details

### Docker Image
- **Base Image**: `nginx:alpine` (~8MB)
- **Total Size**: ~10MB
- **Exposed Port**: 80
- **Entry Point**: nginx

### Web Application
- **Framework**: Vanilla JavaScript (no dependencies)
- **CPU Burner**: Web Workers API
- **Memory Allocation**: Float64Array
- **Max Workers**: 4
- **Memory Range**: 0-1500 MB

### Browser Compatibility
- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support

## 🎯 Deliverables for Course

When using this for Azure training, you should collect:

1. ✅ **Bicep Template**: Exported from ACI deployment
2. ✅ **CPU Metrics Screenshot**: Before/after CPU load
3. ✅ **Memory Metrics Screenshot**: Progressive increase + OOM restart
4. ✅ **Log Analytics Query**: Container termination message

See [AZURE_DEPLOYMENT_GUIDE.md](AZURE_DEPLOYMENT_GUIDE.md) for detailed instructions.

## ❓ Common Questions

**Q: Why does the container restart at 1400-1500MB?**
A: ACI has a hard limit of 1536MB (1.5GiB). The OS and nginx use ~100-200MB, leaving ~1400MB for user allocation.

**Q: How long until metrics appear?**
A: Azure metrics typically appear 2-3 minutes after load changes. Be patient!

**Q: Can I test with more than 1.5GB?**
A: You can configure ACI with more memory (up to 16GB), but this example uses 1.5GB for cost efficiency and to demonstrate limits.

**Q: Why use Web Workers for CPU burning?**
A: Web Workers run in separate threads, allowing us to truly stress multiple CPU cores independently.

## 🛠️ Troubleshooting

### Container won't start
- Check ACR credentials
- Verify admin user is enabled
- Check image name and tag

### Metrics not showing
- Wait 3-5 minutes
- Verify Log Analytics is configured
- Check time range in metrics view

### Can't access the web app
- Verify port 80 is exposed
- Check public IP is assigned
- Ensure container is running

### Memory allocation fails immediately
- Browser may have memory limits
- Try smaller increments
- Check browser console for errors

## 📄 License

This project is provided as-is for educational purposes. Feel free to modify and use in your Azure training courses.

## 🤝 Contributing

Found an issue or have a suggestion? This tool is designed for educational use. Feel free to adapt it for your needs.

## 📚 Additional Resources

- [Azure Container Instances Documentation](https://docs.microsoft.com/azure/container-instances/)
- [Azure Container Registry Documentation](https://docs.microsoft.com/azure/container-registry/)
- [Bicep Documentation](https://docs.microsoft.com/azure/azure-resource-manager/bicep/)
- [Azure Monitor Metrics](https://docs.microsoft.com/azure/azure-monitor/essentials/metrics-supported)

---

**Built for Azure Cloud Training** | Optimized for Container Instances | Perfect for Hands-on Learning 🚀
