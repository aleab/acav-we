/* eslint-disable camelcase */

export enum CorsairDeviceType {
    CDT_Unknown = 0,
    CDT_Mouse = 1,
    CDT_Keyboard = 2,
    CDT_Headset = 3,
    CDT_MouseMat = 4,
    CDT_HeadsetStand = 5,
    CDT_CommanderPro = 6,
    CDT_LightingNodePro = 7,
    CDT_MemoryModule = 8,
    CDT_Cooler = 9,
}

export enum CorsairPhysicalLayout {
    CPL_Invalid = 0,        // dummy value.
    CPL_US = 1,
    CPL_UK = 2,
    CPL_BR = 3,
    CPL_JP = 4,
    CPL_KR = 5,             // valid values for keyboard.
    CPL_Zones1 = 6,
    CPL_Zones2 = 7,
    CPL_Zones3 = 8,
    CPL_Zones4 = 9,         // valid values for mouse.
}

export enum CorsairLogicalLayout {
    CLL_Invalid = 0,        // dummy value.
    CLL_US_Int = 1,
    CLL_NA = 2,
    CLL_EU = 3,
    CLL_UK = 4,
    CLL_BE = 5,
    CLL_BR = 6,
    CLL_CH = 7,
    CLL_CN = 8,
    CLL_DE = 9,
    CLL_ES = 10,
    CLL_FR = 11,
    CLL_IT = 12,
    CLL_ND = 13,
    CLL_RU = 14,
    CLL_JP = 15,
    CLL_KR = 16,
    CLL_TW = 17,
    CLL_MEX = 18
}

export enum CorsairDeviceCaps {
    CDC_None           = 0x0000, // for devices that do not support any SDK functions.
    CDC_Lighting       = 0x0001, // for devices that has controlled lighting.
    CDC_PropertyLookup = 0x0002, // for devices that provide current state through set of properties.
}
