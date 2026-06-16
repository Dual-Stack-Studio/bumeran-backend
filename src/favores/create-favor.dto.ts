import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { TipoFavor } from '../generated/prisma/client';

export class CreateFavorDto {
  @IsEnum(TipoFavor)
  tipo: TipoFavor;

  @IsString()
  @MinLength(3)
  titulo: string;

  @IsString()
  @MinLength(10)
  descripcion: string;

  @IsString()
  @MinLength(2)
  categoria: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsOptional()
  @IsDateString()
  expiraEn?: string;

  @IsOptional()
  @IsString()
  telefonoContacto?: string;
}