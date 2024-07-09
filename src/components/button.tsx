import clsx from "clsx";
import { createContext, useContext } from "react";
import {
	ActivityIndicator,
	Text,
	TextProps,
	TouchableOpacity,
	TouchableOpacityProps
} from "react-native";


type Variants = "primary" | "secondary"

type ButtonProps = TouchableOpacityProps & {
	variant?: Variants
	isLoading?: boolean
}

const themeContext = createContext<{ variant?: Variants }>({})

function Button({
	variant = "primary", 
	isLoading, 
	children, 
	...rest
}: ButtonProps){
	return(
		<TouchableOpacity 
			className={clsx("w-full h-11 flex-row items-center justify-center rounded-lg gap-2",
				{
					"bg-lime-300": variant === "primary",
					"bg-zinc-800": variant === "secondary"
				}
			)} 
			activeOpacity={0.7}
			disabled={isLoading}
			{...rest}
		>
			<themeContext.Provider value={{variant}}>
				{ isLoading ? <ActivityIndicator className="text-lime-950" /> : children}
			</themeContext.Provider>
		</TouchableOpacity>
	)
}

function Title({children}: TextProps){
	const { variant } = useContext(themeContext)
	return(
		<Text className={clsx("text-base font-semibold", 
			{
				"text-lime-950": variant === "primary",
				"text-zinc-200": variant === "secondary"
			}
		)}
		>
			{children}</Text>
	)
}

Button.Title = Title

export { Button };
