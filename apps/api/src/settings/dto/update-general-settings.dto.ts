import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateGeneralSettingsDto {
  @IsString() @MinLength(1) @MaxLength(120) applicationName: string;
  @IsOptional() @IsString() @MaxLength(160) companyDisplayName?: string;
  @IsIn(['Asia/Bangkok']) timeZone: string;
  @IsIn(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']) dateFormat: string;
}
