// CustomerInvite DTOs
import { IsEmail } from 'class-validator';

export class InviteCustomerDto {
  @IsEmail()
  email!: string;
}

export interface PostApiAdminCustomersInviteRequestDto {
  email: string;
}

export interface PostApiAdminCustomersInviteResponseDto {
  customerId: string;
  email: string;
  invitationSent: boolean;
}

export interface GetApiAdminCustomersRequestDto {
}

export interface GetApiAdminCustomersResponseDto {
  id: string;
  email: string;
}
