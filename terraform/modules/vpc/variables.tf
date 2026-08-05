variable region {
    type = string
}

variable vpc_cidr_block {
    description = "The CIDR block for the VPC."
    type        = string
    default = "10.0.0.0/16"
}

variable project_name {
    type = string
}

variable public_subnet_cidr_block {
    description = "The CIDR block for the public subnet."
    type        = string
    default     = "10.0.1.0/24"
}

variable private_subnet_cidr_block {
    description = "The CIDR block for the public subnet."
    type        = string
    default     = "10.0.2.0/24"
}

variable availability_zoneA {
    description = "The availability zone for the subnet."
    type        = string
    default     = "ap-south-1a"
}

variable availability_zoneB {
    description = "The availability zone for the subnet."
    type        = string
    default     = "ap-south-1b"
}