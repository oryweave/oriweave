import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common'
import { parse } from '@oriweave/core'

@Injectable()
export class YamlValidationPipe implements PipeTransform {
  transform(value: Record<string, unknown>) {
    if (!value?.yaml || typeof value.yaml !== 'string') {
      throw new BadRequestException('yaml field is required and must be a string')
    }

    const result = parse(value.yaml)

    if (!result.ok) {
      throw new BadRequestException({
        message: 'Invalid YAML configuration',
        errors: result.errors,
      })
    }

    value._parsed = result.document
    if (result.warnings?.length) {
      value._warnings = result.warnings
    }

    return value
  }
}
