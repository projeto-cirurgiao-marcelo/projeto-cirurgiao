import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsBoolean,
  Min,
  Matches,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Input for `POST /modules/:moduleId/videos/from-r2-hls`.
 *
 * The external FFmpeg+Whisper pipeline delivers a finished master playlist
 * to R2 (`.../playlist.m3u8`) that already includes the HLS bandwidth
 * ladder and the SUBTITLES group. The backend just records the result —
 * there is no server-side work to do, so the created Video is immediately
 * `uploadStatus=READY` and `videoSource='r2_hls'`.
 */
export class CreateVideoFromR2HlsDto {
  @IsString()
  @IsNotEmpty({ message: 'hlsUrl é obrigatório' })
  @IsUrl(
    { protocols: ['https', 'http'], require_protocol: true },
    { message: 'hlsUrl deve ser uma URL válida' },
  )
  @Matches(/\.m3u8(\?.*)?$/i, {
    message: 'hlsUrl deve apontar para um playlist HLS (.m3u8)',
  })
  hlsUrl: string;

  @IsInt()
  @Type(() => Number)
  @Min(1, { message: 'duration deve ser maior que zero' })
  duration: number;

  /**
   * Defaults to `true` because the external pipeline embeds legendas no
   * SUBTITLES group. Set to `false` for exceptional videos where that
   * group is missing.
   */
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  captionsEmbedded?: boolean = true;

  @IsString()
  @IsNotEmpty({ message: 'title é obrigatório' })
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  order?: number;

  @IsString()
  @IsOptional()
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true })
  thumbnailUrl?: string;
}
