module "vpc" {
  source = "../../modules/vpc"

  region                    = var.region
  project_name              = var.project_name
  vpc_cidr_block            = var.vpc_cidr_block
  public_subnet_cidr_block  = var.public_subnet_cidr_block
  private_subnet_cidr_block = var.private_subnet_cidr_block
  availability_zoneA        = var.availability_zoneA
  availability_zoneB        = var.availability_zoneB
}
