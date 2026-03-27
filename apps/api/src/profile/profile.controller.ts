import type { AuthUser } from '@monorepo/contracts';
import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthGrpcService } from '../auth-grpc/auth-grpc.service';
import { UpdateProfileDto } from './update-profile.dto';

@ApiTags('Profile')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Invalid or missing JWT' })
@Controller('api/profile')
export class ProfileController {
  constructor(private readonly authGrpcService: AuthGrpcService) {}

  @ApiOperation({ summary: 'Get current user profile' })
  @Get()
  async getProfile(@CurrentUser() user: AuthUser) {
    const response = await firstValueFrom(
      this.authGrpcService.getProfile(user.id),
    );

    if (!response.found) {
      throw new NotFoundException('User not found');
    }

    return {
      id: response.userId,
      email: response.email,
      username: response.username,
      role: response.role,
      displayName: response.displayName || null,
      avatarUrl: response.avatarUrl || null,
      bio: response.bio || null,
      createdAt: response.createdAt,
    };
  }

  @ApiOperation({ summary: 'Update current user profile' })
  @Patch()
  async updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ) {
    const response = await firstValueFrom(
      this.authGrpcService.updateProfile({
        userId: user.id,
        displayName: dto.displayName ?? '',
        avatarUrl: dto.avatarUrl ?? '',
        bio: dto.bio ?? '',
      }),
    );

    if (!response.success) {
      throw new InternalServerErrorException(response.error);
    }

    return {
      id: response.userId,
      email: response.email,
      username: response.username,
      role: response.role,
      displayName: response.displayName || null,
      avatarUrl: response.avatarUrl || null,
      bio: response.bio || null,
      createdAt: response.createdAt,
    };
  }
}
