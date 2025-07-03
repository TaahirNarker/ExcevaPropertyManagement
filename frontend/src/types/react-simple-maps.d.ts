declare module 'react-simple-maps' {
  import { CSSProperties, MouseEvent, ReactNode } from 'react';
  
  export type GeoProjectionType = 
    | 'geoAzimuthalEqualArea'
    | 'geoAzimuthalEquidistant'
    | 'geoGnomonic'
    | 'geoOrthographic'
    | 'geoStereographic'
    | 'geoEqualEarth'
    | 'geoAlbersUsa'
    | 'geoAlbers'
    | 'geoConicConformal'
    | 'geoConicEqualArea'
    | 'geoConicEquidistant'
    | 'geoEquirectangular'
    | 'geoMercator'
    | 'geoTransverseMercator'
    | 'geoNaturalEarth1';

  export interface GeographyProps {
    geography: any;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    style?: {
      default?: CSSProperties;
      hover?: CSSProperties;
      pressed?: CSSProperties;
    };
    onMouseEnter?: (event: MouseEvent) => void;
    onMouseLeave?: (event: MouseEvent) => void;
    onClick?: (event: MouseEvent) => void;
  }

  export const Geography: React.FC<GeographyProps>;

  export interface GeographiesProps {
    geography: any;
    children: (props: { geographies: any[] }) => ReactNode;
  }

  export const Geographies: React.FC<GeographiesProps>;

  export interface ComposableMapProps {
    projection?: GeoProjectionType | any;
    projectionConfig?: any;
    width?: number;
    height?: number;
    style?: CSSProperties;
    children?: ReactNode;
  }

  export const ComposableMap: React.FC<ComposableMapProps>;

  export interface ZoomableGroupProps {
    zoom?: number;
    center?: [number, number];
    children?: ReactNode;
  }

  export const ZoomableGroup: React.FC<ZoomableGroupProps>;
} 