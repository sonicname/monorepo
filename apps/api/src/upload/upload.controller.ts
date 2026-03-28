import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../common/swagger-responses.dto';
import { UploadService } from './upload.service';

class PresignedUploadRequestDto {
  folder!: string;
  filename!: string;
  contentType!: string;
}

class PresignedDownloadRequestDto {
  key!: string;
}

@ApiTags('Upload')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto, description: 'Invalid or missing JWT' })
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @ApiOperation({ summary: 'Get presigned URL for file upload' })
  @ApiOkResponse({ description: 'Presigned upload URL with key' })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Invalid content type' })
  @Post('presign')
  async getUploadUrl(@Body() dto: PresignedUploadRequestDto) {
    try {
      return await this.uploadService.getPresignedUploadUrl(
        dto.folder,
        dto.filename,
        dto.contentType,
      );
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Upload failed',
      );
    }
  }

  @ApiOperation({ summary: 'Get presigned URL for file download' })
  @ApiOkResponse({ description: 'Presigned download URL' })
  @Post('download')
  async getDownloadUrl(@Body() dto: PresignedDownloadRequestDto) {
    return this.uploadService.getPresignedDownloadUrl(dto.key);
  }

  @ApiOperation({ summary: 'Delete a file from storage' })
  @ApiOkResponse({ description: 'File deleted' })
  @Delete(':key')
  async deleteFile(@Param('key') key: string) {
    await this.uploadService.delete(decodeURIComponent(key));
    return { message: 'File deleted' };
  }
}
