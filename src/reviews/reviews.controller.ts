import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '../generated/prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './create-review.dto';

interface RequestConUsuario extends Request {
  user: User;
}

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateReviewDto, @Req() req: RequestConUsuario) {
    return this.reviewsService.create(dto, req.user.id);
  }

  @Get('usuario/:id')
  getReviewsDeUsuario(@Param('id') id: string) {
    return this.reviewsService.getReviewsDeUsuario(id);
  }
}
