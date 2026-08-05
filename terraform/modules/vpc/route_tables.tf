resource "aws_route_table" "sankatai_public_route_table" {
  vpc_id = aws_vpc.sankatai_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.sankatai_igw.id
  }

  tags = {
    Name = "${var.project_name}-public-route-table"
  }
}

resource "aws_route_table" "sankatai_private_route_table" {
  vpc_id = aws_vpc.sankatai_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.sankatai_igw.id
  }

  tags = {
    Name = "${var.project_name}-private-route-table"
  }
}