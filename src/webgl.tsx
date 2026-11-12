import {Component,useEffect,useState} from 'react';
import type {ReactNode} from 'react';

let webglAvailable:boolean | undefined;
export function useWebGL() {
  const [enabled,setEnabled] = useState<boolean | null>(webglAvailable ?? null);
  useEffect(() => {
    if (webglAvailable === undefined) {
      try {
        const context = document.createElement('canvas').getContext('webgl2');
        webglAvailable = Boolean(context);
        context?.getExtension('WEBGL_lose_context')?.loseContext();
      } catch {
        webglAvailable = false;
      }
    }
    setEnabled(webglAvailable);
  },[]);
  return enabled;
}

export class SceneBoundary extends Component<{children:ReactNode;fallback:ReactNode},{failed:boolean}> {
  state = {failed:false};
  static getDerivedStateFromError() {return {failed:true};}
  render() {return this.state.failed ? this.props.fallback : this.props.children;}
}
