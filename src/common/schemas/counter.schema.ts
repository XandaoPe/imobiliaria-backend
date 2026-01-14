import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CounterDocument = Counter & Document;

@Schema()
export class Counter {
    // Renomeamos de 'id' para 'nome' para evitar conflito com o Document.id do Mongoose
    @Prop({ required: true, unique: true })
    nome: string;

    @Prop({ default: 0 })
    seq: number;
}

export const CounterSchema = SchemaFactory.createForClass(Counter);