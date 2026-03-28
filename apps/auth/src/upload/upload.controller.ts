import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../common/swagger-responses.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadService } from './upload.service';

type AuthenticatedRequest = Request & {
  user: { id: string };
};

class AvatarUploadRequestDto {
  contentType!: string;
}

@ApiTags('Upload')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto, description: 'Invalid or missing JWT' })
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @ApiOperation({ summary: 'Get presigned URL for avatar upload' })
  @ApiOkResponse({ description: 'Presigned upload URL' })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Invalid content type' })
  @UseGuards(JwtAuthGuard)
  @Post('avatar')
  async getAvatarUploadUrl(
    @Request() req: AuthenticatedRequest,
    @Body() dto: AvatarUploadRequestDto,
  ) {
    try {
      return await this.uploadService.getAvatarUploadUrl(
        req.user.id,
        dto.contentType,
      );
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Upload failed',
      );
    }
  }
}
