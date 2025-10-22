terraform {
  required_version = ">= 1.6.0"
  backend "s3" {
    bucket = var.state_bucket
    key    = "realestate-ai/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region                      = var.region
  skip_credentials_validation = true
  skip_requesting_account_id  = true
  skip_metadata_api_check     = true
}

variable "state_bucket" {
  default = "realestate-ai-tfstate"
}

variable "region" {
  default = "us-east-1"
}

resource "aws_s3_bucket" "backups" {
  bucket = "realestate-ai-backups"
  acl    = "private"
}

resource "aws_ecs_cluster" "main" {
  name = "realestate-ai-cluster"
}
