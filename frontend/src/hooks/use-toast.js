import { toast } from "sonner"

export function useToast() {
  return {
    toast: (props) => {
      if (typeof props === 'string') {
        return toast(props)
      }
      
      const { title, description, variant, ...rest } = props
      
      if (variant === 'destructive') {
        return toast.error(title || description, {
          description: title ? description : undefined,
          ...rest
        })
      }
      
      return toast.success(title || description, {
        description: title ? description : undefined,
        ...rest
      })
    }
  }
}