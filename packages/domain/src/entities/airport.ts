import type { AirportCode, CountryCode } from '@airline/shared';

/** 1 regional pequeño … 5 gran hub (docs/02 §2.2). */
export type AirportSizeClass = 1 | 2 | 3 | 4 | 5;

export interface GeoPoint {
  readonly latitude: number;
  readonly longitude: number;
}

export interface Airport extends GeoPoint {
  readonly iata: AirportCode;
  readonly icao: string;
  readonly name: string;
  readonly city: string;
  readonly country: CountryCode;
  readonly elevationFt: number;
  /** Zona horaria IANA (Europe/Madrid). La usa la presentación. */
  readonly timezone: string;
  /**
   * Desfase horario estándar respecto a UTC, en minutos, calculado al construir
   * el conjunto de datos. Lo usa la preferencia horaria de la demanda: a un
   * pasajero le importa la hora local, no la UTC.
   *
   * Fase 1 ignora el horario de verano (±60 min). La curva de preferencia
   * tiene una anchura de varias horas, así que el error no la altera de forma
   * apreciable; queda anotado para no darlo por exacto.
   */
  readonly utcOffsetMinutes: number;

  /**
   * El país pertenece al espacio de libre circulación (Schengen).
   * Es el dato factual que hay detrás de `sameBloc()` en docs/04 §4.1: viajar
   * sin frontera genera más tráfico que viajar con visado.
   */
  readonly schengen: boolean;

  readonly runwayCount: number;
  readonly longestRunwayFt: number;
  readonly sizeClass: AirportSizeClass;

  readonly landingFeeCentsPerTonne: number;
  readonly paxFeeCents: number;
  readonly handlingFeeCents: number;

  /**
   * Tamaño del mercado del aeropuerto. Alimenta el modelo de gravedad.
   * Provisional: ver pendiente C-1 en docs/decisions.md.
   */
  readonly marketWeight: number;
  readonly businessIndex: number;
  readonly leisureIndex: number;
  /** Doce multiplicadores de estacionalidad, de enero a diciembre. */
  readonly seasonality: readonly number[];
}
