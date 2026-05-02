import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Chord, ChordDocument } from './schemas/chord.schema';

@Injectable()
export class ChordsService {
  constructor(
    @InjectModel(Chord.name) private readonly chordModel: Model<ChordDocument>,
  ) {}

  async list(instrument = 'guitar') {
    return this.chordModel.find({ instrument }).sort({ name: 1 }).lean().exec();
  }

  async findByName(name: string, instrument = 'guitar') {
    const chord = await this.chordModel.findOne({ name, instrument }).lean().exec();
    if (!chord) throw new NotFoundException(`Acorde "${name}" no encontrado`);
    return chord;
  }

  async groupedByCategory(instrument = 'guitar') {
    const result = await this.chordModel.aggregate([
      { $match: { instrument } },
      { $sort: { name: 1 } },
      {
        $group: {
          _id: '$category',
          chords: { $push: '$$ROOT' },
        },
      },
      { $project: { category: '$_id', chords: 1, _id: 0 } },
    ]);
    return result;
  }
}
