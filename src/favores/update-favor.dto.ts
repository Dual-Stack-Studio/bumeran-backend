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
import { TipoFavor, EstadoFavor } from '../generated/prisma/client';

export class UpdateFavorDto {
  @IsOptional()
  @IsEnum(TipoFavor)
  tipo?: TipoFavor;

  @IsOptional()
  @IsString()
  @MinLength(3)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  categoria?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsEnum(EstadoFavor)
  estado?: EstadoFavor;

  @IsOptional()
  @IsDateString()
  expiraEn?: string;

  @IsOptional()
  @IsString()
  telefonoContacto?: string;
}