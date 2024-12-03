terraform {
  required_version = ">= 1.0.0"
  
  backend "s3" {
    bucket = "gape-mvp-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-west-2"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = "gape-mvp"
      Terraform   = "true"
    }
  }
}

# VPC Configuration
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"

  name = "gape-mvp-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-west-2a", "us-west-2b", "us-west-2c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = false

  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Terraform   = "true"
    Environment = var.environment
  }
}

# EKS Cluster
module "eks" {
  source = "terraform-aws-modules/eks/aws"

  cluster_name    = "gape-mvp-cluster"
  cluster_version = "1.24"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    general = {
      desired_size = 2
      min_size     = 1
      max_size     = 4

      instance_types = ["t3.medium"]
      capacity_type  = "ON_DEMAND"
    }

    compute = {
      desired_size = 1
      min_size     = 0
      max_size     = 4

      instance_types = ["t3.large"]
      capacity_type  = "SPOT"
    }
  }
}

# RDS Database
module "db" {
  source = "terraform-aws-modules/rds/aws"

  identifier = "gape-mvp-db"

  engine            = "postgres"
  engine_version    = "14.6"
  instance_class    = "db.t3.medium"
  allocated_storage = 20

  db_name  = "gapemvp"
  username = var.db_username
  port     = "5432"

  vpc_security_group_ids = [aws_security_group.rds.id]
  subnet_ids            = module.vpc.private_subnets

  family = "postgres14"

  major_engine_version = "14"

  deletion_protection = true

  parameters = [
    {
      name  = "autovacuum"
      value = 1
    }
  ]
}

# ElastiCache Redis
module "redis" {
  source = "terraform-aws-modules/elasticache/aws"

  cluster_id           = "gape-mvp-redis"
  engine              = "redis"
  engine_version      = "6.x"
  node_type           = "cache.t3.micro"
  num_cache_nodes     = 2
  parameter_group_family = "redis6.x"

  subnet_ids          = module.vpc.private_subnets
  security_group_ids  = [aws_security_group.redis.id]
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  price_class         = "PriceClass_100"
  http_version        = "http2"

  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "ALB"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    target_origin_id       = "ALB"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = true
      headers      = ["*"]

      cookies {
        forward = "all"
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# Security Groups
resource "aws_security_group" "rds" {
  name_prefix = "rds-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [module.eks.cluster_security_group_id]
  }
}

resource "aws_security_group" "redis" {
  name_prefix = "redis-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [module.eks.cluster_security_group_id]
  }
}
