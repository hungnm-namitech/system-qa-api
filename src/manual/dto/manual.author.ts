import { ApiProperty } from '@nestjs/swagger';

export class ManualAuthor {
  @ApiProperty({ example: '0a2ea7f8-8086-4abc-9936-e26a54228652' })
  id: string;

  @ApiProperty({ example: 'Tony Stark' })
  name: string;
}
