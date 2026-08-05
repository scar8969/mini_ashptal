terraform {
  backend "s3" {
    bucket         = "admin-terraform-state-bucket-019"
    key            = "sankatai/dev/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "sankatai-terraform-lock"
    encrypt        = true
  }
}
