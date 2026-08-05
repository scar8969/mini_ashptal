variable "region" {
  description = "The AWS region to create resources in."
  type        = string
  default     = "ap-south-1"
}

variable "project_name" {
  description = "The name of the project."
  type        = string
  default     = "sankatai"
}

variable "vpc_cidr_block" {
  description = "The CIDR block for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr_block" {
  description = "The CIDR block for the public subnet."
  type        = string
  default     = "10.0.1.0/24"
}

variable "private_subnet_cidr_block" {
  description = "The CIDR block for the private subnet."
  type        = string
  default     = "10.0.2.0/24"
}

variable "availability_zoneA" {
  description = "The availability zone for subnet A."
  type        = string
  default     = "ap-south-1a"
}

variable "availability_zoneB" {
  description = "The availability zone for subnet B."
  type        = string
  default     = "ap-south-1b"
}
