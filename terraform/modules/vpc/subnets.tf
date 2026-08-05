resource "aws_subnet" "sankatai_public_subnetA" {
  vpc_id                  = aws_vpc.sankatai_vpc.id
  cidr_block              = var.public_subnet_cidr_block
  availability_zone       = var.availability_zoneA
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-subnetA"
  }
}

resource "aws_subnet" "sankatai_public_subnetB" {
  vpc_id                  = aws_vpc.sankatai_vpc.id
  cidr_block              = var.public_subnet_cidr_block
  availability_zone       = var.availability_zoneB
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-subnetB"
  }
}

resource "aws_subnet" "sankatai_private_subnetA" {
  vpc_id            = aws_vpc.sankatai_vpc.id
  cidr_block        = var.private_subnet_cidr_block
  availability_zone = var.availability_zoneA

  tags = {
    Name = "${var.project_name}-private-subnetA"
  }
}

resource "aws_subnet" "sankatai_private_subnetB" {
  vpc_id            = aws_vpc.sankatai_vpc.id
  cidr_block        = var.private_subnet_cidr_block
  availability_zone = var.availability_zoneB

  tags = {
    Name = "${var.project_name}-private-subnetB"
  }
}