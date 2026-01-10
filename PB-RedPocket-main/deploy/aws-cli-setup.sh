#!/bin/bash
# =============================================================================
# Protocol Bank RedPocket - AWS CLI Setup Script
# Run this script from your local machine to create EC2 instance
# Requires: AWS CLI configured with appropriate permissions
# =============================================================================

set -e

# Configuration
INSTANCE_NAME="redpocket-server"
KEY_NAME="redpocket-key"
INSTANCE_TYPE="t3.medium"
AMI_ID="ami-0c55b159cbfafe1f0"  # Amazon Linux 2023 (update for your region)
SECURITY_GROUP_NAME="redpocket-sg"
REGION="us-east-1"

echo "=========================================="
echo "Protocol Bank RedPocket - AWS Setup"
echo "=========================================="

# =============================================================================
# Create Key Pair
# =============================================================================
echo ""
echo "Creating EC2 Key Pair..."

if aws ec2 describe-key-pairs --key-names $KEY_NAME --region $REGION 2>/dev/null; then
    echo "Key pair '$KEY_NAME' already exists"
else
    aws ec2 create-key-pair \
        --key-name $KEY_NAME \
        --query 'KeyMaterial' \
        --output text \
        --region $REGION > ${KEY_NAME}.pem
    
    chmod 400 ${KEY_NAME}.pem
    echo "Created key pair: ${KEY_NAME}.pem"
fi

# =============================================================================
# Create Security Group
# =============================================================================
echo ""
echo "Creating Security Group..."

VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query 'Vpcs[0].VpcId' --output text --region $REGION)

SG_ID=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=$SECURITY_GROUP_NAME" \
    --query 'SecurityGroups[0].GroupId' \
    --output text \
    --region $REGION 2>/dev/null || echo "None")

if [ "$SG_ID" = "None" ] || [ -z "$SG_ID" ]; then
    SG_ID=$(aws ec2 create-security-group \
        --group-name $SECURITY_GROUP_NAME \
        --description "Security group for RedPocket server" \
        --vpc-id $VPC_ID \
        --query 'GroupId' \
        --output text \
        --region $REGION)
    
    # Add inbound rules
    aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 22 --cidr 0.0.0.0/0 --region $REGION
    aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $REGION
    aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 443 --cidr 0.0.0.0/0 --region $REGION
    
    echo "Created security group: $SG_ID"
else
    echo "Security group already exists: $SG_ID"
fi

# =============================================================================
# Create EC2 Instance
# =============================================================================
echo ""
echo "Creating EC2 Instance..."

# User data script to run on instance startup
USER_DATA=$(cat << 'EOF'
#!/bin/bash
yum update -y
yum install -y docker git
systemctl start docker
systemctl enable docker
usermod -aG docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Clone and setup
cd /home/ec2-user
git clone https://github.com/everest-an/PB-RedPocket.git
chown -R ec2-user:ec2-user PB-RedPocket
EOF
)

INSTANCE_ID=$(aws ec2 run-instances \
    --image-id $AMI_ID \
    --instance-type $INSTANCE_TYPE \
    --key-name $KEY_NAME \
    --security-group-ids $SG_ID \
    --user-data "$USER_DATA" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME}]" \
    --query 'Instances[0].InstanceId' \
    --output text \
    --region $REGION)

echo "Created instance: $INSTANCE_ID"

# =============================================================================
# Wait for Instance
# =============================================================================
echo ""
echo "Waiting for instance to be running..."

aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $REGION

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text \
    --region $REGION)

echo ""
echo "=========================================="
echo "EC2 Instance Created Successfully!"
echo "=========================================="
echo ""
echo "Instance ID:  $INSTANCE_ID"
echo "Public IP:    $PUBLIC_IP"
echo "Key File:     ${KEY_NAME}.pem"
echo ""
echo "Connect with:"
echo "  ssh -i ${KEY_NAME}.pem ec2-user@$PUBLIC_IP"
echo ""
echo "After connecting, run:"
echo "  cd PB-RedPocket/PB-RedPocket-main"
echo "  chmod +x deploy/ec2-setup.sh"
echo "  ./deploy/ec2-setup.sh"
echo ""
