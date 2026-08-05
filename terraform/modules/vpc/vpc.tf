resource "aws_vpc" "sankatai_vpc" {
  cidr_block       = var.vpc_cidr_block
  region = var.region

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

resource "aws_internet_gateway" "sankatai_igw" {
  vpc_id = aws_vpc.sankatai_vpc.id

  tags = {
    Name = "${var.project_name}-igw"
  }
}