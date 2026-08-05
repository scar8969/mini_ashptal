terraform {
  backend "s3" {
    bucket         = "admin-terraform-state-bucket-019"
    key            = "sankatai/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "sankatai-terraform-lock"
    encrypt        = true
  }  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}