// OrderManagement DTOs

export interface OrderItemInputDto {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface PostApiOrdersRequestDto {
  vendorId: string;
  items?: OrderItemInputDto[];
}

export interface PostApiOrdersResponseDto {
  id: string;
  status: string;
  customerId: string;
  vendorId?: string;
}

export interface PatchApiOrdersIdConfirmRequestDto {
  estimatedDelivery: string;
}

export interface PatchApiOrdersIdConfirmResponseDto {
  id: string;
  status: string;
  estimatedDelivery?: string;
}

export interface GetApiOrdersRequestDto {
}

export interface GetApiOrdersResponseDto {
  id: string;
  status: string;
  customerId?: string;
  vendorId?: string;
}
